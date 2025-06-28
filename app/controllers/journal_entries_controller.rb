class JournalEntriesController < ApplicationController
  skip_before_action :verify_authenticity_token
  
  before_action :set_journal_entry, only: [:show, :edit, :update, :destroy]

  # GET /journal_entries
  def index
    @journal_entries = JournalEntry.order(:date)
    
    respond_to do |format|
      format.html
      format.json { render json: @journal_entries }
    end
  end

  # GET /journal_entries/1
  def show
    respond_to do |format|
      format.html
      format.json { render json: @journal_entry }
    end
  end

  # GET /journal_entries/new
  def new
    @journal_entry = JournalEntry.new
    @journal_entry.date = params[:date] if params[:date]
  end

  # GET /journal_entries/1/edit
  def edit
  end

  # POST /journal_entries
  def create
    @journal_entry = JournalEntry.new(journal_entry_params)

    respond_to do |format|
      if @journal_entry.save
        format.html { redirect_to journal_entries_url, notice: 'Journal entry was successfully created.' }
        format.json { render json: @journal_entry, status: :created }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @journal_entry.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /journal_entries/1
  def update
    respond_to do |format|
      if @journal_entry.update(journal_entry_params)
        format.html { redirect_to journal_entries_url, notice: 'Journal entry was successfully updated.' }
        format.json { render json: @journal_entry }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @journal_entry.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /journal_entries/1
  def destroy
    @journal_entry.destroy

    respond_to do |format|
      format.html { redirect_to journal_entries_url, notice: 'Journal entry was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_journal_entry
      @journal_entry = JournalEntry.find(params[:id])
    end

    # Only allow a list of trusted parameters through.
    def journal_entry_params
      params.require(:journal_entry).permit(:date, :content)
    end
end

