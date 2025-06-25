class JournalEntriesController < ApplicationController
  def index
    @journal_entries = JournalEntry.order(date: :desc)
  end

  def show
    @journal_entry = JournalEntry.find(params[:id])
  end

  def new
    @journal_entry = JournalEntry.new
    @journal_entry.date = params[:date] if params[:date]
  end

  def create
    @journal_entry = JournalEntry.new(journal_entry_params)
    
    if @journal_entry.save
      redirect_to monthly_progress_path(@journal_entry.date.year, @journal_entry.date.month), 
                  notice: 'Journal entry was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
    @journal_entry = JournalEntry.find(params[:id])
  end

  def update
    @journal_entry = JournalEntry.find(params[:id])
    
    if @journal_entry.update(journal_entry_params)
      redirect_to monthly_progress_path(@journal_entry.date.year, @journal_entry.date.month), 
                  notice: 'Journal entry was successfully updated.'
    else
      render :edit, status: :unprocessable_entity
    end
  end

  private

  def journal_entry_params
    params.require(:journal_entry).permit(:date, :content)
  end
end
