class JournalEntriesController < ApplicationController
  def index
    @journal_entries = JournalEntry.order(date: :desc)
    
    respond_to do |format|
      format.html
      format.json { render json: @journal_entries }
    end
  end

  def show
    @journal_entry = JournalEntry.find(params[:id])
    
    respond_to do |format|
      format.html
      format.json { render json: @journal_entry }
    end
  end

  def new
    @journal_entry = JournalEntry.new
    @journal_entry.date = params[:date] if params[:date]
  end

  def create
    @journal_entry = JournalEntry.new(journal_entry_params)
    
    if @journal_entry.save
      respond_to do |format|
        format.html { 
          redirect_to monthly_progress_path(@journal_entry.date.year, @journal_entry.date.month), 
          notice: 'Journal entry was successfully created.'
        }
        format.json { render json: @journal_entry, status: :created }
      end
    else
      respond_to do |format|
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: { errors: @journal_entry.errors }, status: :unprocessable_entity }
      end
    end
  end

  def edit
    @journal_entry = JournalEntry.find(params[:id])
  end

  def update
    @journal_entry = JournalEntry.find(params[:id])
    
    if @journal_entry.update(journal_entry_params)
      respond_to do |format|
        format.html { 
          redirect_to monthly_progress_path(@journal_entry.date.year, @journal_entry.date.month), 
          notice: 'Journal entry was successfully updated.'
        }
        format.json { render json: @journal_entry }
      end
    else
      respond_to do |format|
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: { errors: @journal_entry.errors }, status: :unprocessable_entity }
      end
    end
  end

  private

  def journal_entry_params
    params.require(:journal_entry).permit(:date, :content)
  end
end
